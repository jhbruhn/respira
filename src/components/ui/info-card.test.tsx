import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  InfoCard,
  InfoCardTitle,
  InfoCardDescription,
  InfoCardList,
  InfoCardListItem,
} from "./info-card";

describe("InfoCard", () => {
  describe("rendering", () => {
    it("should render with default info variant", () => {
      render(
        <InfoCard>
          <InfoCardTitle>Test Title</InfoCardTitle>
        </InfoCard>,
      );

      expect(screen.getByText("Test Title")).toBeTruthy();
    });

    it("should render with all variants", () => {
      const variants = ["info", "warning", "error", "success"] as const;

      variants.forEach((variant) => {
        const { container } = render(
          <InfoCard variant={variant}>
            <InfoCardTitle variant={variant}>{variant} Card</InfoCardTitle>
          </InfoCard>,
        );

        expect(screen.getByText(`${variant} Card`)).toBeTruthy();
        const firstChild = container.firstChild as HTMLElement | null;
        expect(firstChild?.classList.contains("border-l-4")).toBe(true);
      });
    });

    it("should render custom icon when provided", () => {
      const CustomIcon = (props: React.SVGProps<SVGSVGElement>) => (
        <svg data-testid="custom-icon" {...props} />
      );

      render(
        <InfoCard icon={CustomIcon}>
          <InfoCardTitle>Title</InfoCardTitle>
        </InfoCard>,
      );

      expect(screen.getByTestId("custom-icon")).toBeTruthy();
    });

    it("should not render icon when showDefaultIcon is false", () => {
      const { container } = render(
        <InfoCard showDefaultIcon={false}>
          <InfoCardTitle>Title</InfoCardTitle>
        </InfoCard>,
      );

      const svg = container.querySelector("svg");
      expect(svg).toBeNull();
    });
  });

  describe("InfoCardTitle", () => {
    it("should render with correct variant colors", () => {
      const { rerender } = render(
        <InfoCardTitle variant="info">Info Title</InfoCardTitle>,
      );
      const infoTitle = screen.getByText("Info Title");
      expect(infoTitle.classList.contains("text-info-900")).toBe(true);

      rerender(<InfoCardTitle variant="error">Error Title</InfoCardTitle>);
      const errorTitle = screen.getByText("Error Title");
      expect(errorTitle.classList.contains("text-danger-900")).toBe(true);
    });
  });

  describe("InfoCardDescription", () => {
    it("should render description text", () => {
      render(<InfoCardDescription>This is a description</InfoCardDescription>);
      expect(screen.getByText("This is a description")).toBeTruthy();
    });

    it("should apply variant colors", () => {
      render(
        <InfoCardDescription variant="warning">
          Warning description
        </InfoCardDescription>,
      );
      const desc = screen.getByText("Warning description");
      expect(desc.classList.contains("text-warning-800")).toBe(true);
    });
  });

  describe("InfoCardList", () => {
    it("should render unordered list by default", () => {
      render(
        <InfoCardList>
          <InfoCardListItem>Item 1</InfoCardListItem>
          <InfoCardListItem>Item 2</InfoCardListItem>
        </InfoCardList>,
      );

      const list = screen.getByRole("list");
      expect(list.tagName).toBe("UL");
      expect(list.classList.contains("list-disc")).toBe(true);
    });

    it("should render ordered list when specified", () => {
      render(
        <InfoCardList ordered>
          <InfoCardListItem>First</InfoCardListItem>
          <InfoCardListItem>Second</InfoCardListItem>
        </InfoCardList>,
      );

      const list = screen.getByRole("list");
      expect(list.tagName).toBe("OL");
      expect(list.classList.contains("list-decimal")).toBe(true);
    });

    it("should render list items", () => {
      render(
        <InfoCardList>
          <InfoCardListItem>Item 1</InfoCardListItem>
          <InfoCardListItem>Item 2</InfoCardListItem>
        </InfoCardList>,
      );

      expect(screen.getByText("Item 1")).toBeTruthy();
      expect(screen.getByText("Item 2")).toBeTruthy();
    });
  });

  describe("composition", () => {
    it("should render full info card with all components", () => {
      render(
        <InfoCard variant="success">
          <InfoCardTitle variant="success">Success!</InfoCardTitle>
          <InfoCardDescription variant="success">
            Operation completed successfully
          </InfoCardDescription>
          <InfoCardList variant="success" ordered>
            <InfoCardListItem>First step completed</InfoCardListItem>
            <InfoCardListItem>Second step completed</InfoCardListItem>
          </InfoCardList>
        </InfoCard>,
      );

      expect(screen.getByText("Success!")).toBeTruthy();
      expect(screen.getByText("Operation completed successfully")).toBeTruthy();
      expect(screen.getByText("First step completed")).toBeTruthy();
      expect(screen.getByText("Second step completed")).toBeTruthy();
    });
  });
});
